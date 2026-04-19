#!/usr/bin/env bash
set -u

pkill -f "havenai-agent" >/dev/null 2>&1 || true
pkill -f "HavenAI" >/dev/null 2>&1 || true

TARGETS=(
  "$HOME/.havenai"
  "$HOME/.config/havenai"
  "$HOME/.config/HavenAI"
  "$HOME/.cache/havenai"
  "$HOME/.cache/HavenAI"
  "$HOME/.local/share/havenai"
  "$HOME/.local/share/HavenAI"
)

for target in "${TARGETS[@]}"; do
  [ -n "$target" ] || continue
  case "$target" in
    "$HOME"/*)
      rm -rf -- "$target" >/dev/null 2>&1 || true
      ;;
    *)
      ;;
  esac
done

exit 0
