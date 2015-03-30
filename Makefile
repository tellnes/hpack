
JSFILES = index.js lib/*

all: test lint

test:
	node test/test.js

cover:
	istanbul cover test/test.js

lint:
	jshint $(JSFILES) test/*.js
	jscs $(JSFILES) test/*.js

generate-stories: $(JSFILES)
	node test/generate-stories.js

test-all: test generate-stories
	node test/run-cases.js

clean:
	rm -r coverage

.PHONY: all test cover lint generate-stories test-all-cases clean
