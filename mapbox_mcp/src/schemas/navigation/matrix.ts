/*
 * @Author: AidenYangX
 * @Email: xscs709560271@gmail.com
 * @Date: 2024-12-21 22:41:35
 * @Description: Matrix Schema
 */
import { z } from "zod";
import { CoordinateSchema } from "../navigation/direction";

const BearingSchema = z.object({
  angle: z
    .number()
    .min(0)
    .max(360)
    .describe("Angle in degrees from true north"),
  deviation: z
    .number()
    .min(0)
    .max(180)
    .describe("Allowed deviation in degrees"),
});

// Matrix Arguments Schema
export const MatrixArgsSchema = z.object({
  coordinates: z
    .array(CoordinateSchema)
    .min(2)
    .max(25)
    .describe("Array of coordinates"),
  profile: z
    .enum(["driving", "walking", "cycling"])
    .default("driving")
    .describe("Navigation mode"),
  annotations: z
    .enum(["duration", "distance", "duration,distance"])
    .default("duration,distance")
    .describe("Type of matrix to return"),
  approaches: z
    .array(z.enum(["unrestricted", "curb"]))
    .optional()
    .describe("Approaches to coordinates"),
  bearings: z
    .array(BearingSchema)
    .optional()
    .describe("Bearings for coordinates"),
  sources: z
    .array(z.number().min(0))
    .optional()
    .describe("Indices of source coordinates"),
  destinations: z
    .array(z.number().min(0))
    .optional()
    .describe("Indices of destination coordinates"),
  fallback_speed: z
    .number()
    .positive()
    .optional()
    .describe("Speed for direct path calculation when no route exists"),
  depart_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    .optional()
    .describe("Departure time in ISO 8601 format"),
});
