#!/usr/bin/env python3 -I
"""Lit une page d'équipe competitions.ffbb.com (HTML) sur stdin et écrit en CSV
(sur stdout, sans en-tête) les matchs de cette équipe, au format de la table `games`.

Usage : ffbb_parse_games.py <id_equipe>     (l'id est le dernier segment de l'URL /equipes/<id>)

Les données sont dans le flux Next.js (self.__next_f.push) : on le recompose,
puis on décode le tableau JSON "data" qui contient les rencontres.
"""
import csv
import json
import re
import sys


def rsc_text(html: str) -> str:
    chunks = re.findall(r'self\.__next_f\.push\(\[1,(".*?")\]\)</script>', html, re.S)
    return "".join(json.loads(c) for c in chunks)


def find_matches(txt: str) -> list:
    m = re.search(r'"data":(?=\[\{"id":"\d+","date_rencontre")', txt)
    if not m:
        raise SystemExit("aucune rencontre trouvée dans la page")
    data, _ = json.JSONDecoder().raw_decode(txt, m.end())
    return data


def score(value):
    return "" if value in (None, "") else int(value)


def competition_code(html: str) -> str:
    """Code de compétition lu dans le titre : « … engagée dans la compétition "DM5" »."""
    m = re.search(r"compétition (?:&quot;|\")(.+?)(?:&quot;|\")", html)
    return m.group(1) if m else ""


def team_label(team: dict, competition: str) -> str:
    """Toutes les équipes du club portent le même nom FFBB : on ajoute numéro et compétition."""
    number = f" {team['numeroEquipe']}" if team.get("numeroEquipe") else ""
    comp = f" ({competition})" if competition else ""
    return f"{team['nom']}{number}{comp}"


def main() -> None:
    team_id = sys.argv[1]
    html = sys.stdin.read()
    competition = competition_code(html)
    writer = csv.writer(sys.stdout, lineterminator="\n")
    for g in find_matches(rsc_text(html)):
        home, away = g["idEngagementEquipe1"], g["idEngagementEquipe2"]
        if home is None or away is None:
            continue  # journée d'exemption : pas d'adversaire, pas de match
        if home["id"] == team_id:
            is_home = True  # l'équipe 1 reçoit
            ours, theirs, s_ours, s_theirs = home, away, g["resultatEquipe1"], g["resultatEquipe2"]
        elif away["id"] == team_id:
            is_home = False
            ours, theirs, s_ours, s_theirs = away, home, g["resultatEquipe2"], g["resultatEquipe1"]
        else:
            continue  # rencontre d'une autre équipe
        game_date, kickoff_time = g["date_rencontre"].split("T")
        writer.writerow(
            [
                g["numero"],
                team_label(ours, competition),
                theirs["nom"],
                game_date,
                kickoff_time,
                "true" if is_home else "false",
                score(s_ours),
                score(s_theirs),
            ]
        )


if __name__ == "__main__":
    main()
