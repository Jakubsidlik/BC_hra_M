import csv
import json

db = {}

try:
    with open('karty.csv', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter='|') # Čteme Markdown tabulku (případně změň na ';' pokud máš středníky)
        
        # Pokud kopíruješ přímo z Markdownu, je potřeba očistit mezery a hlavičku
        for row in reader:
            symbol = row.get(' symbol ', row.get('symbol', '')).strip()
            if not symbol or symbol == ':---': continue 
            
            has_effect = str(row.get(' hasEffect ', row.get('hasEffect', ''))).strip().upper() == 'ANO'
            
            # Bezpečné přečtení countu (pokud tam není, dáme základní 1)
            raw_count = str(row.get(' count ', row.get('count', '1'))).strip()
            count = int(raw_count) if raw_count.isdigit() else 1

            card = {
                "symbol": symbol,
                "name": row.get(' name ', row.get('name', '')).strip(),
                "type": row.get(' type ', row.get('type', '')).strip(),
                "count": count,
                "hasEffect": has_effect
            }

            if has_effect:
                card["effects"] = {}
                effectA_name = row.get(' effectA_name ', row.get('effectA_name', '')).strip()
                if effectA_name:
                    card["effects"]["optionA"] = {
                        "id": row.get(' effectA_id ', row.get('effectA_id', '')).strip(),
                        "name": effectA_name,
                        "description": row.get(' effectA_desc ', row.get('effectA_desc', '')).strip(),
                        "target": row.get(' effectA_target ', row.get('effectA_target', '')).strip()
                    }
                effectB_name = row.get(' effectB_name ', row.get('effectB_name', '')).strip()
                if effectB_name:
                    card["effects"]["optionB"] = {
                        "id": row.get(' effectB_id ', row.get('effectB_id', '')).strip(),
                        "name": effectB_name,
                        "description": row.get(' effectB_desc ', row.get('effectB_desc', '')).strip(),
                        "target": row.get(' effectB_target ', row.get('effectB_target', '')).strip()
                    }

            db[symbol] = card

    ts_content = """// TENTO SOUBOR BYL VYGENEROVÁN AUTOMATICKY
export interface CardEffect {
  id: string;
  name: string;
  description: string;
  target?: string;
}

export interface CardEntry {
  symbol: string;
  name: string;
  type: 'number' | 'operator' | 'variable' | 'syntax';
  count: number;
  hasEffect: boolean;
  effects?: {
    optionA: CardEffect;
    optionB?: CardEffect;
  };
}

export const cardsDatabase: Record<string, CardEntry> = """ + json.dumps(db, indent=2, ensure_ascii=False) + ";"

    with open('cardsDB.ts', 'w', encoding='utf-8') as f:
        f.write(ts_content)
        
    print("ÚSPĚCH: Databáze včetně počtu karet (count) byla vygenerována!")

except FileNotFoundError:
    print("CHYBA: Nemůžu najít soubor 'karty.csv'.")