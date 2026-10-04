PORT ?= 8840
HOST ?= 127.0.0.1
URL  := http://$(HOST):$(PORT)/

.PHONY: run serve test
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
		echo "Bigmouth & Run on $(URL)  (Ctrl-C to stop)"; \
		exec python3 -m http.server $(PORT) --bind $(HOST); \
	fi

# Just the server, no browser.
serve: | node_modules
	python3 -m http.server $(PORT) --bind $(HOST)

# Headless playthrough of all seven missions (screenshots land in out/).
test: | node_modules
	node tools/shot.mjs story

node_modules:
	npm install
