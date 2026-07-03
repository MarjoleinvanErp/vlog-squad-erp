# Upload-feedback: voortgangsbalk + "Post geplaatst!" bevestiging

**Datum:** 2026-07-03 (dag van het feest — scope bewust minimaal)

## Probleem

Na "Drop post" bij een video-opdracht staat er 10–30 seconden alleen de knoptekst
"Posten..." zonder beweging. Kinderen denken dat de app hangt, klikken weg of
drukken nog een keer. Na een geslaagde post is er geen bevestigingsmoment — de
app navigeert stilletjes door.

## Oplossing

### 1. Upload-helper met echte voortgang — `src/lib/upload-progress.ts`

`uploadToSignedUrlWithProgress(signedUrl, blob, contentType, onProgress)`:
XHR `PUT` naar de bestaande signed upload URL (die `createSubmissionUploadUrl`
al teruggeeft, inclusief token). `xhr.upload.onprogress` rapporteert
`loaded/total` als 0–1. Geeft `null` door als voortgang onbekend is
(browser zonder progress-events) zodat de UI kan terugvallen op een animatie.

Geen wijziging aan de server action nodig: `signedUrl` zit al in het
`SignedUpload`-resultaat.

### 2. `UploadOverlay` — `src/app/team/challenge/[id]/upload-overlay.tsx`

Fullscreen overlay (patroon van `event-overlay.tsx`: fixed inset-0, z-100,
donkere backdrop, pink card). Twee fases:

- **`uploading`**: titel "Video posten...", voortgangsbalk (pink gradient +
  glow) met percentage. Bij onbekende voortgang: doorlopende golf-animatie.
  Subtekst "Nog even wachten! 📤".
- **`success`**: groot vinkje met framer-motion spring-animatie,
  "Post geplaatst! 🎉". Na ~1,5 s volgt de redirect.

### 3. Integratie in `challenge-form.tsx`

- **VideoForm** (`handlePost`): overlay in `uploading`-fase tonen, upload via
  de nieuwe helper met live voortgang, daarna `submitChallengeAction`, dan
  `success`-fase, dan `router.push`. Bij fout: overlay sluiten en bestaande
  foutmelding tonen (opnieuw proberen blijft mogelijk).
- **PhotoForm** (`handleSubmit`): submit is alleen een DB-insert (foto's zijn
  al geüpload per vakje) — alleen `success`-fase tonen vóór de redirect.
- **NonMediaForm** (tekst/meerkeuze): zelfde `success`-fase vóór de redirect,
  zodat "Post geplaatst!" overal hetzelfde herkenbare moment is.

## Foutafhandeling

- XHR-fout of timeout → overlay dicht, foutmelding in bestaand foutvak,
  retry mogelijk (zoals nu).
- Progress-events blijven uit → balk animeert onbepaald; upload werkt gewoon.

## Buiten scope

- Per-foto voortgang bij het maken van foto's (bestanden zijn ~300 KB na
  compressie; bestaande "Uploaden…"-tekst per vakje volstaat).
- Upload-retry-automatiek.

## Verificatie

`npm run build` + `npm run lint`; handmatige test op de gedeployde app
(video opnemen → posten → balk + vinkje zien).
