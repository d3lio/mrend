class Slide {
    constructor(content, metadata) {
        this.content = content;
        this.metadata = metadata ? new Map(metadata) : new Map();
    }
}

module.exports = Slide;
