import { WasteListing, UserProfile, SmartMatchResult } from '../types';

/**
 * Calculates straight line distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Generates Smart Matches for a user based on their role, location, and listing characteristics
 */
export function calculateSmartMatches(
  listings: WasteListing[],
  currentUser: UserProfile
): SmartMatchResult[] {
  return listings
    .filter((l) => l.status === 'active' && l.user_id !== currentUser.id)
    .map((listing) => {
      // 1. Distance Calculation
      const distance = calculateDistanceKm(
        currentUser.latitude,
        currentUser.longitude,
        listing.latitude,
        listing.longitude
      );

      // 2. Location Proximity Score (100 if < 10km, decays smoothly up to 100km)
      let locationProximity = 100 - Math.min(distance * 0.8, 70);
      if (listing.district === currentUser.district) {
        locationProximity = Math.max(locationProximity, 85);
      }

      // 3. Category Fit based on user role
      let categoryFit = 60; // base score
      let recommendationReason = 'Available in your regional circular network.';

      // Extract slug from joined category or category_id
      let categorySlug = listing.category?.slug || '';
      if (!categorySlug) {
        if (listing.category_id.includes('organic')) categorySlug = 'organic';
        else if (listing.category_id.includes('agricultural')) categorySlug = 'agricultural';
        else if (listing.category_id.includes('paper')) categorySlug = 'paper';
        else if (listing.category_id.includes('plastics')) categorySlug = 'plastics';
        else if (listing.category_id.includes('ewaste')) categorySlug = 'e-waste';
        else if (listing.category_id.includes('metals')) categorySlug = 'metals';
        else if (listing.category_id.includes('glass')) categorySlug = 'glass';
        else if (listing.category_id.includes('textiles')) categorySlug = 'textiles';
      }

      if (currentUser.role === 'farmer') {
        if (categorySlug === 'organic' || categorySlug === 'agricultural') {
          categoryFit = 98;
          recommendationReason = 'High organic nitrogen/fibre content ideal for soil enrichment and mulching.';
        } else {
          categoryFit = 30;
        }
      } else if (currentUser.role === 'recycler') {
        if (['plastics', 'paper', 'metals', 'e-waste', 'glass'].includes(categorySlug)) {
          categoryFit = 95;
          recommendationReason = 'Commercial-grade clean recyclables matching your recovery intake categories.';
        } else {
          categoryFit = 40;
        }
      } else if (currentUser.role === 'business') {
        if (listing.listing_type === 'free' || listing.listing_type === 'exchange') {
          categoryFit = 85;
          recommendationReason = 'Cost-effective circular exchange for enterprise resource redistribution.';
        }
      } else if (currentUser.role === 'ngo') {
        categoryFit = 90;
        recommendationReason = 'Great candidate for community collection drives and volunteer upcycling.';
      } else {
        // Individual
        categoryFit = 80;
        recommendationReason = 'Convenient household reuse and neighborhood circular exchange.';
      }

      // 4. Quantity Suitability (prefer moderate to high quantity for commercial/farmers, manageable for individuals)
      let quantitySuitability = 80;
      if (currentUser.role === 'farmer' && listing.quantity >= 20) {
        quantitySuitability = 95;
      } else if (currentUser.role === 'recycler' && listing.quantity >= 15) {
        quantitySuitability = 90;
      } else if (currentUser.role === 'individual' && listing.quantity <= 30) {
        quantitySuitability = 92;
      }

      // 5. Circular Impact Score
      const recyclability = listing.category?.recyclability_score || 80;
      const circularImpact = Math.round(recyclability * 0.95);

      // Weighted Composite Score
      const compositeScore = Math.round(
        categoryFit * 0.40 +
        locationProximity * 0.30 +
        quantitySuitability * 0.15 +
        circularImpact * 0.15
      );

      return {
        listing,
        match_score: Math.min(Math.max(compositeScore, 10), 99),
        distance_km: distance,
        factors: {
          category_fit: Math.round(categoryFit),
          location_proximity: Math.round(locationProximity),
          quantity_suitability: Math.round(quantitySuitability),
          circular_impact: circularImpact,
        },
        recommendation_reason: recommendationReason,
      };
    })
    .sort((a, b) => b.match_score - a.match_score);
}
