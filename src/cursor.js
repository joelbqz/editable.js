import $ from 'jquery'
import rangy from 'rangy'
import * as viewport from './util/viewport'

import * as content from './content'
import * as parser from './parser'
import * as string from './util/string'
import * as nodeType from './node-type'
import error from './util/error'
import * as rangeSaveRestore from './range-save-restore'

/**
 * The Cursor module provides a cross-browser abstraction layer for cursor.
 *
 * @module core
 * @submodule cursor
 */

export default class Cursor {
  /**
  * Class for the Cursor module.
  *
  * @class Cursor
  * @constructor
  */
  constructor (editableHost, rangyRange) {
    this.setHost(editableHost)
    this.range = rangyRange
    this.isCursor = true
  }

  isAtEnd () {
    return parser.isEndOfHost(
      this.host,
      this.range.endContainer,
      this.range.endOffset
    )
  }

  isAtTextEnd () {
    return parser.isTextEndOfHost(
      this.host,
      this.range.endContainer,
      this.range.endOffset
    )
  }

  isAtLastLine () {
    const range = rangy.createRange()
    range.selectNodeContents(this.host)

    const hostCoords = range.nativeRange.getBoundingClientRect()
    const cursorCoords = this.range.nativeRange.getBoundingClientRect()

    return hostCoords.bottom === cursorCoords.bottom
  }

  isAtFirstLine () {
    const range = rangy.createRange()
    range.selectNodeContents(this.host)

    const hostCoords = range.nativeRange.getBoundingClientRect()
    const cursorCoords = this.range.nativeRange.getBoundingClientRect()

    return hostCoords.top === cursorCoords.top
  }

  isAtBeginning () {
    return parser.isBeginningOfHost(
      this.host,
      this.range.startContainer,
      this.range.startOffset
    )
  }

  // Insert content before the cursor
  //
  // @param {String, DOM node or document fragment}
  insertBefore (element) {
    if (string.isString(element)) element = content.createFragmentFromString(element)
    if (parser.isDocumentFragmentWithoutChildren(element)) return

    element = this.adoptElement(element)

    let preceedingElement = element
    if (element.nodeType === nodeType.documentFragmentNode) {
      const lastIndex = element.childNodes.length - 1
      preceedingElement = element.childNodes[lastIndex]
    }

    this.range.insertNode(element)
    this.range.setStartAfter(preceedingElement)
    this.range.setEndAfter(preceedingElement)
  }

  // Insert content after the cursor
  //
  // @param {String, DOM node or document fragment}
  insertAfter (element) {
    if (string.isString(element)) element = content.createFragmentFromString(element)
    if (parser.isDocumentFragmentWithoutChildren(element)) return

    element = this.adoptElement(element)
    this.range.insertNode(element)
  }

  // Alias for #setVisibleSelection()
  setSelection () {
    this.setVisibleSelection()
  }

  setVisibleSelection () {
    if (this.win.document.activeElement !== this.host) {
      const {x, y} = viewport.getScrollPosition(this.win)
      this.win.scrollTo(x, y)
    }
    rangy.getSelection(this.win).setSingleRange(this.range)
  }

  // Take the following example:
  // (The character '|' represents the cursor position)
  //
  // <div contenteditable="true">fo|o</div>
  // before() will return a document fragment containing a text node 'fo'.
  //
  // @returns {Document Fragment} content before the cursor or selection.
  before () {
    const range = this.range.cloneRange()
    range.collapse(true)
    range.setStartBefore(this.host)
    return content.cloneRangeContents(range)
  }

  textBefore () {
    const range = this.range.cloneRange()
    range.collapse(true)
    range.setStartBefore(this.host)
    return range.toString()
  }

  // Same as before() but returns a string.
  beforeHtml () {
    return content.getInnerHtmlOfFragment(this.before())
  }

  // Take the following example:
  // (The character '|' represents the cursor position)
  //
  // <div contenteditable="true">fo|o</div>
  // after() will return a document fragment containing a text node 'o'.
  //
  // @returns {Document Fragment} content after the cursor or selection.
  after () {
    const range = this.range.cloneRange()
    range.collapse(false)
    range.setEndAfter(this.host)
    return content.cloneRangeContents(range)
  }

  textAfter () {
    const range = this.range.cloneRange()
    range.collapse(false)
    range.setEndAfter(this.host)
    return range.toString()
  }

  // Same as after() but returns a string.
  afterHtml () {
    return content.getInnerHtmlOfFragment(this.after())
  }

  // Get the BoundingClientRect of the cursor.
  // The returned values are transformed to be absolute
  // (relative to the document).
  getCoordinates (positioning = 'absolute') {
    const coords = this.range.nativeRange.getBoundingClientRect()
    if (positioning === 'fixed') return coords


    // translate into absolute positions
    const {x, y} = viewport.getScrollPosition(this.win)
    return {
      top: coords.top + y,
      bottom: coords.bottom + y,
      left: coords.left + x,
      right: coords.right + x,
      height: coords.height,
      width: coords.width
    }
  }

  moveBefore (element) {
    this.updateHost(element)
    this.range.setStartBefore(element)
    this.range.setEndBefore(element)
    if (this.isSelection) return new Cursor(this.host, this.range)
  }

  moveAfter (element) {
    this.updateHost(element)
    this.range.setStartAfter(element)
    this.range.setEndAfter(element)
    if (this.isSelection) return new Cursor(this.host, this.range)
  }

  // Move the cursor to the beginning of the host.
  moveAtBeginning (element = this.host) {
    this.updateHost(element)
    this.range.selectNodeContents(element)
    this.range.collapse(true)
    if (this.isSelection) return new Cursor(this.host, this.range)
  }

  // Move the cursor to the end of the host.
  moveAtEnd (element = this.host) {
    this.updateHost(element)
    this.range.selectNodeContents(element)
    this.range.collapse(false)
    if (this.isSelection) return new Cursor(this.host, this.range)
  }

  // Move the cursor after the last visible character of the host.
  moveAtTextEnd (element) {
    return this.moveAtEnd(parser.latestChild(element))
  }

  setHost (element) {
    if (element.jquery) element = element[0]
    this.host = element
    this.win = (element === undefined || element === null) ? window : element.ownerDocument.defaultView
  }

  updateHost (element) {
    const host = parser.getHost(element)
    if (!host) error('Can not set cursor outside of an editable block')
    this.setHost(host)
  }

  retainVisibleSelection (callback) {
    this.save()
    callback()
    this.restore()
    this.setVisibleSelection()
  }

  save () {
    this.savedRangeInfo = rangeSaveRestore.save(this.range)
    this.savedRangeInfo.host = this.host
  }

  restore () {
    if (!this.savedRangeInfo) error('Could not restore selection')

    this.host = this.savedRangeInfo.host
    this.range = rangeSaveRestore.restore(this.host, this.savedRangeInfo)
    this.savedRangeInfo = undefined
  }

  equals (cursor) {
    if (!cursor) return false

    if (!cursor.host) return false
    if (!cursor.host.isEqualNode(this.host)) return false

    if (!cursor.range) return false
    if (!cursor.range.equals(this.range)) return false

    return true
  }

  // Create an element with the correct ownerWindow
  // (see: http://www.w3.org/DOM/faq.html#ownerdoc)
  createElement (tagName, attributes = {}) {
    const element = this.win.document.createElement(tagName)
    for (const attributeName in attributes) {
      const attributeValue = attributes[attributeName]
      element.setAttribute(attributeName, attributeValue)
    }
    return element
  }

  createTextNode (text) {
    return this.win.document.createTextNode(text)
  }

  // Make sure a node has the correct ownerWindow
  // (see: https://developer.mozilla.org/en-US/docs/Web/API/Document/importNode)
  adoptElement (node) {
    return content.adoptElement(node, this.win.document)
  }

  // Currently we call triggerChange manually after format changes.
  // This is to prevent excessive triggering of the change event during
  // merge or split operations or other manipulations by scripts.
  triggerChange () {
    $(this.host).trigger('formatEditable')
  }
}
