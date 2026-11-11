#!/usr/bin/env bash
# Récupère les matchs de pages d'équipes competitions.ffbb.com avec curl
# et les écrit dans un CSV au format de la table `games`.
#
# Usage :
#   scripts/ffbb-games-to-csv.sh [-o games.csv] [-O] [urls.txt]
#     -o  CSV de sortie (défaut : games.csv)
#     -O  ouvre le CSV à la fin (macOS)
#     urls.txt : une URL d'équipe par ligne (défaut : scripts/ffbb-urls.txt)
#
# Aucun cookie n'est nécessaire en temps normal. Si le site répond 403 (protection
# anti-bot), copiez un cookie frais bunny_shield_id_* de votre navigateur :
#   FFBB_COOKIE='bunny_shield_id_188154=...' scripts/ffbb-games-to-csv.sh
# (un cookie périmé provoque lui-même un 403 : dans ce cas, ne le passez pas).
# Pause entre deux appels : 3 s par défaut, réglable avec FFBB_DELAY=<secondes>.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="games.csv"
OPEN=0
while getopts "o:O" opt; do
  case "$opt" in
    o) OUT="$OPTARG" ;;
    O) OPEN=1 ;;
    *) sed -n '2,13p' "$0"; exit 1 ;;
  esac
done
shift $((OPTIND - 1))
URLS_FILE="${1:-$HERE/ffbb-urls.txt}"

cookie_args=()
[[ -n "${FFBB_COOKIE:-}" ]] && cookie_args=(-b "$FFBB_COOKIE")

echo "code,team_name,opponent_name,game_date,kickoff_time,is_home,score_ours,score_theirs" > "$OUT"

ok=0; ko=0; first=1
while IFS= read -r url; do
  [[ -z "$url" || "$url" == \#* ]] && continue
  # Pause entre deux appels : évite de déclencher le challenge anti-bot de la FFBB
  [[ $first -eq 0 ]] && sleep "${FFBB_DELAY:-3}"
  first=0
  team_id="${url##*/equipes/}"; team_id="${team_id%%[/?#]*}"
  if html=$(curl -sS --fail --retry 2 --max-time 30 "${cookie_args[@]}" \
        -H 'accept: text/html,application/xhtml+xml' \
        -H 'accept-language: fr;q=0.9' \
        -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36' \
        "$url") \
     && rows=$(printf '%s' "$html" | python3 -I "$HERE/ffbb_parse_games.py" "$team_id"); then
    printf '%s\n' "$rows" >> "$OUT"
    ok=$((ok + 1))
    echo "OK   $url ($(printf '%s\n' "$rows" | wc -l | tr -d ' ') matchs)" >&2
  else
    ko=$((ko + 1))
    echo "FAIL $url" >&2
  fi
done < "$URLS_FILE"

echo "$ok page(s) réussie(s), $ko échec(s) -> $OUT" >&2
[[ $OPEN -eq 1 ]] && open "$OUT"
exit 0
