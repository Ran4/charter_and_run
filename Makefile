PORT ?= 8840
HOST ?= 127.0.0.1
URL  := http://$(HOST):$(PORT)/

FEATURES_PORT ?= 8850
FEATURES_URL  := http://$(HOST):$(FEATURES_PORT)/

.PHONY: run serve test features
.DEFAULT_GOAL := run

# Serve the game and open it in the browser once the server answers. Ctrl-C stops the server.
# If something is already serving on $(PORT), just open the page. NOOPEN=1 skips the browser.
run: | node_modules
	@if curl -sf -o /dev/null $(URL); then \
		echo "Already running on $(URL)"; \
		[ -n "$(NOOPEN)" ] || setsid -f xdg-open $(URL) >/dev/null 2>&1; \
	else \
		[ -n "$(NOOPEN)" ] || ( for i in $$(seq 50); do \
			curl -sf -o /dev/null $(URL) && exec setsid -f xdg-open $(URL) >/dev/null 2>&1; \
			sleep 0.1; \
		done ) & \
		echo "Charter & Run on $(URL)  (Ctrl-C to stop)"; \
		exec python3 -m http.server $(PORT) --bind $(HOST); \
	fi

# Just the server, no browser.
serve: | node_modules
	python3 -m http.server $(PORT) --bind $(HOST)

# The free-roam feature list (features/): serves the page and a JSON API (scripts/serve_features.py,
# GET /api lists the endpoints) and opens the page in Firefox. Queue / unqueue on the page edits
# features/TODO.md. If it is already running, just open the page. NOOPEN=1 skips the browser.
features:
	@if curl -sf -o /dev/null $(FEATURES_URL)api; then \
		echo "Already running on $(FEATURES_URL)"; \
		[ -n "$(NOOPEN)" ] || setsid -f firefox $(FEATURES_URL) >/dev/null 2>&1; \
	else \
		[ -n "$(NOOPEN)" ] || ( for i in $$(seq 150); do \
			curl -sf -o /dev/null $(FEATURES_URL)api && exec setsid -f firefox $(FEATURES_URL) >/dev/null 2>&1; \
			sleep 0.1; \
		done ) & \
		exec uv run scripts/serve_features.py --port $(FEATURES_PORT) --host $(HOST); \
	fi

# Headless playthrough of all 13 missions; must end with RESULT: PASS (screenshots land in out/).
test: | node_modules
	node tools/shot.mjs story

node_modules:
	npm install
