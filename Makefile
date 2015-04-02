
JS_FILES_LIB = index.js lib/*
JS_FILES_TEST = test/*.js

.PHONY: all clean

all: test lint

# Test

.PHONY: test test-all generate-stories

test:
	node test/test.js

generate-stories: $(JS_FILES_LIB)
	node test/generate-stories.js

test-all: test generate-stories
	node test/run-cases.js

clean::
	rm -r test/hpack-test-case/node-hpack

# Linting

.PHONY: lint
lint:
	jshint $(JS_FILES_LIB) $(JS_FILES_TEST)
	jscs $(JS_FILES_LIB) $(JS_FILES_TEST)


# Coverage

COVERAGE_FILES += coverage/coverage.json
COVERAGE_FILES += coverage/lcov.info
COVERAGE_FILES += coverage/lcov-report/index.html

.PHONY: cover check-coverage submit-to-coveralls

$(COVERAGE_FILES): $(JS_FILES_LIB) $(JS_FILES_TEST)
	istanbul cover test/test.js

cover: coverage/lcov-report/index.html

check-coverage: coverage/coverage.json
	istanbul check-coverage \
		--statements 100 \
		--functions 100 \
		--branches 100 \
		--lines 100 \
		coverage/coverage.json

submit-to-coveralls: coverage/lcov.info
	cat coverage/lcov.info | coveralls

clean::
	rm -r coverage
