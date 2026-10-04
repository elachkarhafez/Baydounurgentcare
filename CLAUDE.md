# ElaSystems sites repo

Each folder is a single-file client website built with the `ela-studio` skill (`.claude/skills/ela-studio/`) and deployed to Vercel (team `team_AYB0SFZ1qQkp6TebSji5xEKA`).

## Standing rule: when a business doesn't want their site

Whenever the user says a business doesn't want its site (or "said no", "passed", "not interested"), follow `.claude/skills/ela-studio/references/declined.md` straight away. The user has pre-approved every step, so don't ask first:

1. Rebuild the site as a generic ElaSystems concept in `demos/<niche>/`:
   - a new fictional brand
   - none of their photos, names or contact details
   - every CTA pointing to @ela.systems
2. Deploy it under a new neutral Vercel name.
3. Take the old business-name link offline by pausing its Vercel project. Offer the delete link too.
4. `git rm` the original folder.
5. Mark the business as declined in `signatures.md`.
6. Report the new link.
