import {
  haversineDistance,
  estimateDrivingTime,
  formatDistance,
  formatDuration,
  getDirectionsUrl,
} from '../distance';

describe('Distance Utilities', () => {
  describe('haversineDistance', () => {
    it('should calculate distance between Bangkok and Samut Prakan', () => {
      // Bangkok Central: 13.7563°N, 100.5018°E
      // Samut Prakan: 13.5990°N, 100.5998°E
      const distance = haversineDistance(13.7563, 100.5018, 13.5990, 100.5998);

      // Expected distance is approximately 18.4 km
      expect(distance).toBeGreaterThan(17);
      expect(distance).toBeLessThan(20);
    });

    it('should return 0 for same coordinates', () => {
      const distance = haversineDistance(13.7563, 100.5018, 13.7563, 100.5018);
      expect(distance).toBe(0);
    });

    it('should handle negative coordinates (Sydney to Buenos Aires)', () => {
      // Sydney: -33.8688°S, 151.2093°E
      // Buenos Aires: -34.6037°S, -58.3816°W
      const distance = haversineDistance(-33.8688, 151.2093, -34.6037, -58.3816);

      // Expected distance is approximately 11,800+ km
      expect(distance).toBeGreaterThan(11800);
      expect(distance).toBeLessThan(12000);
    });

    it('should calculate distance between Bangkok and Nonthaburi', () => {
      // Bangkok: 13.7563°N, 100.5018°E
      // Nonthaburi: 13.8621°N, 100.5144°E
      const distance = haversineDistance(13.7563, 100.5018, 13.8621, 100.5144);

      // Expected distance is approximately 11.8 km
      expect(distance).toBeGreaterThan(11);
      expect(distance).toBeLessThan(13);
    });

    it('should return distance rounded to 2 decimal places', () => {
      const distance = haversineDistance(13.7563, 100.5018, 13.5990, 100.5998);
      const decimalPlaces = distance.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe('estimateDrivingTime', () => {
    it('should estimate time for short distance (18.5 km)', () => {
      const time = estimateDrivingTime(18.5);
      // At 60 km/h: 18.5 / 60 * 60 = 18.5 minutes
      expect(time).toBe(19); // Rounded to 19
    });

    it('should estimate time for medium distance (120 km)', () => {
      const time = estimateDrivingTime(120);
      // At 60 km/h: 120 / 60 * 60 = 120 minutes
      expect(time).toBe(120);
    });

    it('should respect custom average speed', () => {
      const time = estimateDrivingTime(120, 80);
      // At 80 km/h: 120 / 80 * 60 = 90 minutes
      expect(time).toBe(90);
    });

    it('should handle very short distances', () => {
      const time = estimateDrivingTime(1);
      // At 60 km/h: 1 / 60 * 60 = 1 minute
      expect(time).toBe(1);
    });

    it('should handle highway speeds', () => {
      const time = estimateDrivingTime(200, 100);
      // At 100 km/h: 200 / 100 * 60 = 120 minutes
      expect(time).toBe(120);
    });
  });

  describe('formatDistance', () => {
    it('should format distance in kilometers', () => {
      expect(formatDistance(5.234)).toBe('5.2 km');
    });

    it('should format distance in meters for small values', () => {
      expect(formatDistance(0.85)).toBe('850 m');
    });

    it('should format very small distances', () => {
      expect(formatDistance(0.123)).toBe('123 m');
    });

    it('should format large distances', () => {
      expect(formatDistance(123.456)).toBe('123.5 km');
    });

    it('should handle exactly 1 km', () => {
      expect(formatDistance(1.0)).toBe('1.0 km');
    });

    it('should format just under 1 km as meters', () => {
      expect(formatDistance(0.999)).toBe('999 m');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes only for short durations', () => {
      expect(formatDuration(45)).toBe('45m');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(150)).toBe('2h 30m');
    });

    it('should format hours only when no remaining minutes', () => {
      expect(formatDuration(120)).toBe('2h');
    });

    it('should format single hour', () => {
      expect(formatDuration(60)).toBe('1h');
    });

    it('should format very short durations', () => {
      expect(formatDuration(5)).toBe('5m');
    });

    it('should format long durations', () => {
      expect(formatDuration(195)).toBe('3h 15m');
    });
  });

  describe('getDirectionsUrl', () => {
    it('should generate valid Google Maps URL', () => {
      const url = getDirectionsUrl(13.7563, 100.5018, 13.5990, 100.5998);

      expect(url).toContain('google.com/maps/dir');
      expect(url).toContain('api=1');
      expect(url).toContain('origin=13.7563,100.5018');
      expect(url).toContain('destination=13.5990,100.5998');
      expect(url).toContain('travelmode=driving');
    });

    it('should handle negative coordinates', () => {
      const url = getDirectionsUrl(-33.8688, 151.2093, -34.6037, -58.3816);

      expect(url).toContain('origin=-33.8688,151.2093');
      expect(url).toContain('destination=-34.6037,-58.3816');
    });

    it('should maintain coordinate precision', () => {
      const url = getDirectionsUrl(13.75631234, 100.50181234, 13.59901234, 100.59981234);

      expect(url).toContain('13.75631234');
      expect(url).toContain('100.50181234');
      expect(url).toContain('13.59901234');
      expect(url).toContain('100.59981234');
    });
  });
});
