import "server-only";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import {
  myListingsSchema,
  MY_LISTINGS_PAGE_SIZE,
  type MyListingFilter,
  type MyListingSort,
} from "../schemas/my-listings";

export async function getMyListings(query: {
  filter?: MyListingFilter;
  sort?: MyListingSort;
  search?: string;
  page?: number;
} = {}) {
  const data = await serverApiFetch<unknown>("/listings/me", {
    params: {
      filter: query.filter ?? "all",
      sort: query.sort ?? "newest",
      ...(query.search ? { search: query.search } : {}),
      page: query.page ?? 1,
      limit: MY_LISTINGS_PAGE_SIZE,
    },
  });
  return parseResponse(myListingsSchema, data, "GET /listings/me");
}
