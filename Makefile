PORT ?= 8840
HOST ?= 127.0.0.1
URL  := http://$(HOST):$(PORT)/

FEATURES_PORT ?= 8850
FEATURES_URL  := http://$(HOST):$(FEATURES_PORT)/

.PHONY: run serve test features voice voice-cast voice-review voice-check voice-hear
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

# The voices (features/implemented/roster.md, DESIGN §12.4, tools/voice/voice.mjs; the key in .env,
# never committed). `make voice DRY=1` says what would be made and what it costs, without a request;
# `make voice` makes what is missing in cast.json's scope (WHO=a,b LIMIT=n MAX=chars ALL=1 PRUNE=1
# REPROCESS=1; PART=feature:x only that part of the script, a new feature's lines, scope or not).
VOICE_FLAGS = $(if $(DRY),--dry) $(if $(WHO),--who $(WHO)) $(if $(LIMIT),--limit $(LIMIT)) $(if $(PART),--part $(PART)) $(if $(MAX),--max $(MAX)) $(if $(ALL),--all) $(if $(PRUNE),--prune)
voice:
	node tools/voice/voice.mjs $(if $(REPROCESS),reprocess $(if $(WHO),--who $(WHO)),$(VOICE_FLAGS))
# Paid auditions for a role: each of its candidates in cast.json says the role's preview text
# (SEARCH=n finds n more Voice Library candidates first).
voice-cast:
	node tools/voice/voice.mjs cast $(WHO) $(if $(SEARCH),--search $(SEARCH))
# The review page: the candidates, the review list, every line by mission and part.
voice-review:
	PORT=$(or $(REVIEWPORT),8846) node tools/voice/review.mjs
# No requests: lines in scope without a clip, the manifest, orphans; exit 1 if anything is missing.
voice-check:
	node tools/voice/voice.mjs check
# Listen to the clips as the game plays them (free): pitch and words per role.
voice-hear:
	node tools/voice/voice.mjs hear $(if $(WHO),--who $(WHO))
