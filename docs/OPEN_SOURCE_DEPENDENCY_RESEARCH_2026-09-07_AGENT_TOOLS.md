# Open-Source Dependency Research — Agent / Knowledge / OCR Follow-up

Date: 2026-09-07

This is a compact companion to `AI_HANDOFF_2026-09-07_AGENT_FOUNDATIONS_RESEARCH.md`.

## Ranked findings

| Project | locaOS role | Decision |
|---|---|---|
| `shadcn/improve` | codebase audit + implementation planning skill | Adopt as internal dev tooling candidate |
| `tobi/qmd` | local hybrid document/code knowledge search | Strong evaluation candidate |
| `langchain-ai/openwiki` | self-maintaining repo wiki | Evaluate as documentation companion |
| `baidu/Unlimited-OCR` | long-document OCR provider | Benchmark as second OCR provider |
| `trycompai/crm` | agent work-queue / memory / follow-up patterns | Reference only |
| `DietrichGebert/ponytail` | agent engineering skills | Evaluate as dev tooling |
| `andrewng/openworker` | desktop AI coworker | Unverified / no adoption decision |

## Key architectural conclusion

These projects do not replace the current locaOS core. Their useful parts sit at the edges:

```text
                    locaOS authoritative core
                              │
          ┌───────────────────┼──────────────────┐
          │                   │                  │
      OCR adapter       Knowledge retrieval   Dev tooling
          │                   │                  │
   PaddleOCR /           QMD / OpenWiki     improve / ponytail
   Unlimited-OCR
          │
          └────────────── evidence ──────────────┐
                                                  ↓
                                    validation / human confirmation
                                                  ↓
                                        canonical domain records
```

## Most important new discovery

`Unlimited-OCR` is worth testing because it targets long multi-page document parsing rather than ordinary page-level OCR. However, community reports also show failure modes involving repetition and hallucinated text on difficult scans. Therefore it should remain behind the existing OCR provider port and never directly create canonical identity/contract/financial records.

## Immediate action

Do not install these projects into production. Finish the current PaddleOCR driver-license pipeline first, then run a controlled benchmark using the same real Moroccan document samples against multiple OCR providers.
