'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export interface VenueReviewSummary {
  averageRating: number;
  totalReviews: number;
}

interface VenueReviewSummaryState {
  summaries: Record<number, VenueReviewSummary>;
  isLoading: boolean;
  hasError: boolean;
}

export function useVenueReviewSummaries(venueIds: number[]): VenueReviewSummaryState {
  const venueIdsKey = useMemo(
    () => [...new Set(venueIds)].sort((a, b) => a - b).join(','),
    [venueIds],
  );
  const [summaries, setSummaries] = useState<Record<number, VenueReviewSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isActive = true;
    const requestedIds = venueIdsKey
      .split(',')
      .filter(Boolean)
      .map(Number);

    async function loadSummaries() {
      if (requestedIds.length === 0) {
        if (isActive) {
          setSummaries({});
          setIsLoading(false);
          setHasError(false);
        }
        return;
      }

      setIsLoading(true);
      setHasError(false);

      const results = await Promise.all(
        requestedIds.map(async (venueId) => {
          const response = await api.reviews.getVenueReviews(venueId, {
            page: 1,
            per_page: 1,
          });

          if (!response.success || !response.data) {
            return null;
          }

          return [
            venueId,
            {
              averageRating: response.data.average_rating,
              totalReviews: response.data.total_reviews,
            },
          ] as const;
        }),
      );

      if (!isActive) return;

      const successfulResults = results.filter(
        (result): result is NonNullable<typeof result> => result !== null,
      );

      setSummaries(Object.fromEntries(successfulResults));
      setHasError(successfulResults.length !== requestedIds.length);
      setIsLoading(false);
    }

    void loadSummaries();

    return () => {
      isActive = false;
    };
  }, [venueIdsKey]);

  return { summaries, isLoading, hasError };
}
