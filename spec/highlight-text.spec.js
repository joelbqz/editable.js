describe('highlightText', function() {

  // Helper Methods
  // --------------

  var createParagraphWithTextNodes = function(firstPart, parts) {
    var textNode, part;
    var elem = $('<p>'+ firstPart +'</p>')[0];
    for (var i=1; i<arguments.length; i++) {
      part = arguments[i];
      textNode = document.createTextNode(part);
      elem.appendChild(textNode);
    }
    return elem;
  };

  var iterateOverElement = function(elem, regex) {
    var matches = highlightText.find(elem, regex);
    var range = highlightText.getRange(elem);
    highlightText.iterate(range, matches);
  };


  describe('minimal case', function() {

    beforeEach(function() {
      this.textNode = $('<div>a</div>')[0];
      this.regex = /a/g;
    });

    it('extracts the text', function(){
      var range = highlightText.getRange(this.textNode);
      var text = highlightText.extractText(range);
      expect(text).toEqual('a');
    });

    it('finds the letter "a"', function() {
      var matches = highlightText.find(this.textNode, this.regex);
      var firstMatch = matches[0];
      expect(firstMatch.search).toEqual('a');
      expect(firstMatch.matchIndex).toEqual(0);
      expect(firstMatch.startIndex).toEqual(0);
      expect(firstMatch.endIndex).toEqual(1);
    });

    it('does not find the letter "b"', function() {
      var matches = highlightText.find(this.textNode, /b/g);
      expect(matches.length).toEqual(0);
    });
  });

  describe('Some juice.', function() {

    beforeEach(function() {
      this.textNode = $('<div>Some juice.</div>')[0];
      this.regex = /juice/g;
    });

    it('finds the word "juice"', function() {
      var matches = highlightText.find(this.textNode, this.regex);
      var firstMatch = matches[0];
      expect(firstMatch.search).toEqual('juice');
      expect(firstMatch.matchIndex).toEqual(0);
      expect(firstMatch.startIndex).toEqual(5);
      expect(firstMatch.endIndex).toEqual(10);
    });

  });

  describe('iterator', function() {

    beforeEach(function() {
      this.wrapWord = sinon.stub(highlightText, 'wrapWord');
    });

    afterEach(function() {
      this.wrapWord.restore();
    });

    it('finds a letter that it is own text node', function() {
      var elem = createParagraphWithTextNodes('a', 'b', 'c');
      iterateOverElement(elem, /b/g);
      var portions = this.wrapWord.firstCall.args[0];

      expect(portions.length).toEqual(1);
      expect(portions[0].text).toEqual('b');
      expect(portions[0].offset).toEqual(0);
      expect(portions[0].length).toEqual(1);
      expect(portions[0].lastPortion).toEqual(true);
    });

    it('finds a letter that is in a text node with a letter before', function() {
      var elem = createParagraphWithTextNodes('a', 'xb', 'c');
      iterateOverElement(elem, /b/g);
      var portions = this.wrapWord.firstCall.args[0];

      expect(portions.length).toEqual(1);
      expect(portions[0].text).toEqual('b');
      expect(portions[0].offset).toEqual(1);
      expect(portions[0].length).toEqual(1);
      expect(portions[0].lastPortion).toEqual(true);
    });

    it('finds a letter that is in a text node with a letter after', function() {
      var elem = createParagraphWithTextNodes('a', 'bx', 'c');
      iterateOverElement(elem, /b/g);
      var portions = this.wrapWord.firstCall.args[0];

      expect(portions.length).toEqual(1);
      expect(portions[0].text).toEqual('b');
      expect(portions[0].offset).toEqual(0);
      expect(portions[0].length).toEqual(1);
      expect(portions[0].lastPortion).toEqual(true);
    });

    it('finds two letters that span over two text nodes', function() {
      var elem = createParagraphWithTextNodes('a', 'b', 'c');
      iterateOverElement(elem, /bc/g);
      var portions = this.wrapWord.firstCall.args[0];

      expect(portions.length).toEqual(2);
      expect(portions[0].text).toEqual('b');
      expect(portions[0].lastPortion).toEqual(false);

      expect(portions[1].text).toEqual('c');
      expect(portions[1].lastPortion).toEqual(true);
    });

    it('finds three letters that span over three text nodes', function() {
      var elem = createParagraphWithTextNodes('a', 'b', 'c');
      iterateOverElement(elem, /abc/g);
      var portions = this.wrapWord.firstCall.args[0];

      expect(portions.length).toEqual(3);
      expect(portions[0].text).toEqual('a');
      expect(portions[1].text).toEqual('b');
      expect(portions[2].text).toEqual('c');
    });

    it('finds a word that is partially contained in two text nodes', function() {
      var elem = createParagraphWithTextNodes('a', 'bxx', 'xxe');
      iterateOverElement(elem, /xxxx/g);
      var portions = this.wrapWord.firstCall.args[0];

      expect(portions.length).toEqual(2);
      expect(portions[0].text).toEqual('xx');
      expect(portions[0].offset).toEqual(1);
      expect(portions[0].length).toEqual(2);
      expect(portions[0].lastPortion).toEqual(false);

      expect(portions[1].text).toEqual('xx');
      expect(portions[1].offset).toEqual(0);
      expect(portions[1].length).toEqual(2);
      expect(portions[1].lastPortion).toEqual(true);
    });

  });

  describe('wrapWord', function() {

    it('wraps a word in a single text node', function() {
      var elem = $('<div>Some juice.</div>')[0];
      var matches = highlightText.find(elem, /juice/g);
      var range = highlightText.getRange(elem);
      highlightText.iterate(range, matches);
      expect(range.commonAncestorContainer.outerHTML)
        .toEqual('<div>Some <span data-awesome="crazy">juice</span>.</div>')
    });

    it('wraps a word with a partial <em> element', function() {
      var elem = $('<div>Some jui<em>ce</em>.</div>')[0];
      var matches = highlightText.find(elem, /juice/g);
      var range = highlightText.getRange(elem);
      highlightText.iterate(range, matches);
      expect(range.commonAncestorContainer.outerHTML)
        .toEqual('<div>Some <span data-awesome="crazy">jui</span><em><span data-awesome="crazy">ce</span></em>.</div>')
    });
  });

});
