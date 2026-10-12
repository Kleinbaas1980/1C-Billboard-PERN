import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../utils/errors.js";

export function validate(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      console.log("validation failed", req.body, result.error.issues);
      return next(
        new HttpError(400, "Check the submitted fields.", {
          fields: result.error.flatten().fieldErrors,
        }),
      );
    }
    // if (!result.success)
    //   return next(
    //     new HttpError(400, "Check the submitted fields.", {
    //       fields: result.error.flatten().fieldErrors,
    //     }),
    //   );

    req.validate = result.data;
    next();
  };
}
