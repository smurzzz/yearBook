/* Mock photos bundled with the app. Keys are the same `/photos/…` paths the
   fixtures use, so components resolve them with `img(src)`.
   Requires are explicit so Metro can analyze them statically. */

import type { ImageSourcePropType } from "react-native";
const avatarAlyssa = require("../../assets/mock/avatar-alyssa.jpg");
const avatarDaniel = require("../../assets/mock/avatar-daniel.jpg");
const avatarJoshua = require("../../assets/mock/avatar-joshua.jpg");
const avatarMiguel = require("../../assets/mock/avatar-miguel.jpg");
const avatarMikaela = require("../../assets/mock/avatar-mikaela.jpg");
const coverFoundation = require("../../assets/mock/cover-foundation-day.jpg");
const coverGraduation = require("../../assets/mock/cover-graduation.jpg");
const coverIntramurals = require("../../assets/mock/cover-intramurals.jpg");
const coverScience = require("../../assets/mock/cover-science-fair.jpg");
const photoBasketball = require("../../assets/mock/photo-basketball.jpg");
const photoCampusSteps = require("../../assets/mock/photo-campus-steps.jpg");
const photoCapsTossed = require("../../assets/mock/photo-caps-tossed.jpg");
const photoCheeringCrowd = require("../../assets/mock/photo-cheering-crowd.jpg");
const photoCulturalDance = require("../../assets/mock/photo-cultural-dance.jpg");
const photoDiploma = require("../../assets/mock/photo-diploma.jpg");
const photoDramaRehearsal = require("../../assets/mock/photo-drama-rehearsal.jpg");
const photoFoundationBooth = require("../../assets/mock/photo-foundation-booth.jpg");
const photoFoundationParade = require("../../assets/mock/photo-foundation-parade.jpg");
const photoGraduationFamily = require("../../assets/mock/photo-graduation-family.jpg");
const photoPhotographyClub = require("../../assets/mock/photo-photography-club.jpg");
const photoRoboticsBuild = require("../../assets/mock/photo-robotics-build.jpg");
const photoScienceModel = require("../../assets/mock/photo-science-model.jpg");
const photoSciencePresent = require("../../assets/mock/photo-science-present.jpg");
const photoTrackRelay = require("../../assets/mock/photo-track-relay.jpg");
const photoVolleyball = require("../../assets/mock/photo-volleyball.jpg");

export const IMAGES: Record<string, number> = {
  "/photos/avatar-alyssa.jpg": avatarAlyssa,
  "/photos/avatar-daniel.jpg": avatarDaniel,
  "/photos/avatar-joshua.jpg": avatarJoshua,
  "/photos/avatar-miguel.jpg": avatarMiguel,
  "/photos/avatar-mikaela.jpg": avatarMikaela,
  "/photos/cover-foundation-day.jpg": coverFoundation,
  "/photos/cover-graduation.jpg": coverGraduation,
  "/photos/cover-intramurals.jpg": coverIntramurals,
  "/photos/cover-science-fair.jpg": coverScience,
  "/photos/photo-basketball.jpg": photoBasketball,
  "/photos/photo-campus-steps.jpg": photoCampusSteps,
  "/photos/photo-caps-tossed.jpg": photoCapsTossed,
  "/photos/photo-cheering-crowd.jpg": photoCheeringCrowd,
  "/photos/photo-cultural-dance.jpg": photoCulturalDance,
  "/photos/photo-diploma.jpg": photoDiploma,
  "/photos/photo-drama-rehearsal.jpg": photoDramaRehearsal,
  "/photos/photo-foundation-booth.jpg": photoFoundationBooth,
  "/photos/photo-foundation-parade.jpg": photoFoundationParade,
  "/photos/photo-graduation-family.jpg": photoGraduationFamily,
  "/photos/photo-photography-club.jpg": photoPhotographyClub,
  "/photos/photo-robotics-build.jpg": photoRoboticsBuild,
  "/photos/photo-science-model.jpg": photoScienceModel,
  "/photos/photo-science-present.jpg": photoSciencePresent,
  "/photos/photo-track-relay.jpg": photoTrackRelay,
  "/photos/photo-volleyball.jpg": photoVolleyball,
};

/** Resolve a photo path to an ImageSource:
    - absolute URLs (signed API urls, avatars) and local files (picker output)
      render via `{ uri }`;
    - fixture keys `/photos/…` resolve to the bundled mock assets;
    - unknown keys fall back to the first cover so a missing asset never
      crashes a screen. */
export const img = (src: string): ImageSourcePropType =>
  /^(https?|file|content|data):/.test(src)
    ? { uri: src }
    : (IMAGES[src] ?? IMAGES["/photos/cover-intramurals.jpg"]);
