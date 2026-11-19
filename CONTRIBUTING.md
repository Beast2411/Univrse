# Contributing to UNIVRSE

## Team ownership

- **Aarush:** Common backend, Dashboard, Schedule, Help Desk, and final integration.
- **Udit:** Assignments page.
- **Akshit:** Attendance page.
- **Sanskar:** Marketplace page.
- **Vansh:** Clubs and Events page.

## Collaboration rules

- Maintain one common Express backend, owned by Aarush. Do not create separate backend servers.
- Follow [`API_CONTRACT.md`](API_CONTRACT.md) for planned endpoints and shared data fields.
- Do not independently rename endpoints or data fields.
- Preserve the existing shared layout, header, sidebar, and global theme.
- Report additional API requirements to Aarush. Any additional endpoint must be proposed to Aarush and approved before implementation.
- Work only on assigned page files unless permission is given.
- Backend endpoint implementation is owned by Aarush. Coordinate any API changes with the team and update `API_CONTRACT.md` before frontend integration.
- Keep existing page behavior, including local JSON and browser storage, until that page's API migration is reviewed and integrated.
