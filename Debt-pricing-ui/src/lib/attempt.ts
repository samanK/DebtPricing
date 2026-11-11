import { ApiError } from "./api-error";

type Attempt<T> = { data: T; error?: undefined } | { data?: undefined; error: ApiError };

/** Runs an API call and turns an ApiError into a value; other errors (including redirects) propagate. */
export async function attempt<T>(promise: Promise<T>): Promise<Attempt<T>> {
  try {
    return { data: await promise };
  } catch (error) {
    if (error instanceof ApiError) return { error };
    throw error;
  }
}
