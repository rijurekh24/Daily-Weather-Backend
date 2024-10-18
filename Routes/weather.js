import express from "express";
import {
  weather,
  thresold,
  dailySummaries,
  postthreshold,
} from "../Controllers/controller.js";
const router = express.Router();

router.post("/threshold", postthreshold);
router.get("/weather", weather);
router.get("/daily-summaries", dailySummaries);
router.get("/threshold", thresold);

export default router;
