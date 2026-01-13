# T191: Geolocation API Examples

## Frontend Integration Examples

### 1. Geocode User-Entered Address

```typescript
// When user enters address in a form
async function geocodeAddress(address: string) {
  try {
    const response = await fetch('/api/v1/facilities/geocode', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    if (!response.ok) {
      throw new Error('Failed to geocode address');
    }

    const { data } = await response.json();
    // data: { latitude, longitude, address, city, country }
    
    return data;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Usage in form
const handleAddressSubmit = async (address: string) => {
  const location = await geocodeAddress(address);
  if (location) {
    // Auto-fill form fields
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    setCity(location.city);
    setCountry(location.country);
  }
};
```

### 2. Reverse Geocode Map Click

```typescript
// When user clicks on a map
async function reverseGeocode(lat: number, lng: number) {
  try {
    const response = await fetch('/api/v1/facilities/reverse-geocode', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        latitude: lat, 
        longitude: lng 
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to reverse geocode');
    }

    const { data } = await response.json();
    // data: { address, city, country }
    
    return data;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// Usage with map library (e.g., Leaflet, Mapbox)
map.on('click', async (e) => {
  const { lat, lng } = e.latlng;
  const location = await reverseGeocode(lat, lng);
  if (location) {
    // Show popup with address
    L.popup()
      .setLatLng([lat, lng])
      .setContent(location.address)
      .openOn(map);
  }
});
```

### 3. Update Facility Geolocation

```typescript
// Update facility with geolocation data
async function updateFacilityLocation(
  facilityId: string, 
  location: {
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    country?: string;
  }
) {
  try {
    const response = await fetch(`/api/v1/facilities/${facilityId}/geolocation`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(location),
    });

    if (!response.ok) {
      throw new Error('Failed to update facility location');
    }

    const { data } = await response.json();
    return data; // Updated facility object
  } catch (error) {
    console.error('Update error:', error);
    throw error;
  }
}

// Usage: Update only coordinates
await updateFacilityLocation('facility-123', {
  latitude: 37.7749,
  longitude: -122.4194,
});

// Usage: Update only city/country
await updateFacilityLocation('facility-123', {
  city: 'San Francisco',
  country: 'United States',
});

// Usage: Update everything
await updateFacilityLocation('facility-123', {
  latitude: 37.7749,
  longitude: -122.4194,
  address: '123 Main St, San Francisco, CA 94102',
  city: 'San Francisco',
  country: 'United States',
});
```

### 4. Display Facilities on Map

```typescript
// Fetch facilities with geolocation
async function getFacilities() {
  const response = await fetch('/api/v1/facilities', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const { data } = await response.json();
  return data;
}

// Render on map
const facilities = await getFacilities();
facilities.forEach(facility => {
  if (facility.latitude && facility.longitude) {
    // Add marker to map
    L.marker([facility.latitude, facility.longitude])
      .addTo(map)
      .bindPopup(`
        <strong>${facility.name}</strong><br>
        ${facility.address || facility.city || ''}
      `);
  }
});
```

### 5. React Component Example

```tsx
import { useState } from 'react';

interface LocationFormProps {
  facilityId: string;
  onUpdate: (facility: any) => void;
}

function LocationForm({ facilityId, onUpdate }: LocationFormProps) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeocode = async () => {
    setLoading(true);
    setError(null);

    try {
      // Geocode address
      const geocodeRes = await fetch('/api/v1/facilities/geocode', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!geocodeRes.ok) {
        throw new Error('Address not found');
      }

      const { data: location } = await geocodeRes.json();

      // Update facility
      const updateRes = await fetch(`/api/v1/facilities/${facilityId}/geolocation`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(location),
      });

      if (!updateRes.ok) {
        throw new Error('Failed to update facility');
      }

      const { data: updatedFacility } = await updateRes.json();
      onUpdate(updatedFacility);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="location-form">
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Enter facility address"
      />
      <button onClick={handleGeocode} disabled={loading}>
        {loading ? 'Geocoding...' : 'Geocode & Update'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### 6. Vue.js Component Example

```vue
<template>
  <div class="location-form">
    <input
      v-model="address"
      type="text"
      placeholder="Enter facility address"
    />
    <button @click="handleGeocode" :disabled="loading">
      {{ loading ? 'Geocoding...' : 'Geocode & Update' }}
    </button>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  facilityId: string;
}>();

const emit = defineEmits<{
  update: [facility: any];
}>();

const address = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function handleGeocode() {
  loading.value = true;
  error.value = null;

  try {
    // Geocode
    const geocodeRes = await fetch('/api/v1/facilities/geocode', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address: address.value }),
    });

    if (!geocodeRes.ok) throw new Error('Address not found');
    
    const { data: location } = await geocodeRes.json();

    // Update facility
    const updateRes = await fetch(
      `/api/v1/facilities/${props.facilityId}/geolocation`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(location),
      }
    );

    if (!updateRes.ok) throw new Error('Failed to update');
    
    const { data: updatedFacility } = await updateRes.json();
    emit('update', updatedFacility);
    
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>
```

## TypeScript Types

```typescript
// Geolocation types
interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
}

interface ReverseGeocodeResult {
  address: string;
  city: string;
  country: string;
}

interface Facility {
  id: string;
  name: string;
  location: string;
  timezone: string;
  totalZones: number;
  status: 'active' | 'inactive' | 'maintenance';
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

interface GeolocationUpdate {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  country?: string;
}
```

## Error Handling

```typescript
async function safeGeocode(address: string) {
  try {
    const response = await fetch('/api/v1/facilities/geocode', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    // Handle different error cases
    if (response.status === 400) {
      throw new Error('Invalid address format');
    }
    
    if (response.status === 404) {
      throw new Error('Address not found. Please check and try again.');
    }
    
    if (response.status === 500) {
      throw new Error('Geocoding service temporarily unavailable');
    }

    if (!response.ok) {
      throw new Error('Failed to geocode address');
    }

    const { data } = await response.json();
    return { success: true, data };
    
  } catch (error) {
    console.error('Geocoding error:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    };
  }
}
```

## Best Practices

1. **Debounce geocoding requests** when user types to avoid excessive API calls
2. **Cache results** to reduce redundant geocoding
3. **Validate coordinates** before submission (lat: -90 to 90, lng: -180 to 180)
4. **Show loading states** during async operations
5. **Handle errors gracefully** with user-friendly messages
6. **Use optimistic updates** for better UX
7. **Implement retry logic** for failed requests
8. **Show map preview** before saving location

## Rate Limiting

Be mindful of Google Maps API quotas:
- Free tier: 40,000 requests/month
- Cache results when possible
- Debounce user input
- Consider batch operations
