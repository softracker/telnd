import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { validate } from '../middleware/validate';
import { roleGuard } from '../middleware/auth';
import { mapPinSchema, mapBookmarkSchema } from '@telnd/validation';

type MapEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
  };
};

const map = new Hono<MapEnv>();

// ============================================
// Map Pins
// ============================================
map.get('/pins', async (c) => {
  const { type, city, area, lat, lng, radius, page = '1', limit = '50' } = c.req.query();
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const where: any = {};
  if (type) where.targetType = type.split(',');
  if (city) where.city = city;
  if (area) where.area = { contains: area, mode: 'insensitive' };

  // If lat/lng provided, filter by radius
  if (lat && lng && radius) {
    const latFloat = parseFloat(lat);
    const lngFloat = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    
    // Simple bounding box filter (PostGIS would be better for production)
    const latDelta = radiusKm / 111; // ~111km per degree
    const lngDelta = radiusKm / (111 * Math.cos((latFloat * Math.PI) / 180));
    
    where.lat = { gte: latFloat - latDelta, lte: latFloat + latDelta };
    where.lng = { gte: lngFloat - lngDelta, lte: lngFloat + lngDelta };
  }

  const [pins, total] = await Promise.all([
    prisma.mapPin.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.mapPin.count({ where }),
  ]);

  return c.json({ pins, total, page: pageNum, limit: limitNum });
});

map.get('/pins/:id', async (c) => {
  const id = c.req.param('id');
  const pin = await prisma.mapPin.findUnique({ where: { id } });
  if (!pin) return c.json({ error: 'Pin not found' }, 404);

  // Track view
  await prisma.mapPinView.create({
    data: { pinId: id },
  });

  return c.json(pin);
});

map.post('/pins', roleGuard('ADMIN'), validate(mapPinSchema), async (c) => {
  const body = c.get('validatedData');
  
  const pin = await prisma.mapPin.upsert({
    where: { targetType_targetId: { targetType: body.targetType, targetId: body.targetId } },
    update: { lat: body.lat, lng: body.lng, address: body.address, area: body.area, city: body.city, isExact: body.isExact },
    create: body,
  });

  return c.json(pin, 201);
});

map.delete('/pins/:id', roleGuard('ADMIN'), async (c) => {
  const id = c.req.param('id');
  await prisma.mapPin.delete({ where: { id } });
  return c.json({ success: true });
});

// ============================================
// Bookmarks
// ============================================
map.get('/bookmarks', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const bookmarks = await prisma.mapPinBookmark.findMany({
    where: { userId: user.id },
    include: { pin: true },
    orderBy: { createdAt: 'desc' },
  });

  return c.json(bookmarks);
});

map.post('/bookmarks', validate(mapBookmarkSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { pinId } = c.get('validatedData');
  const bookmark = await prisma.mapPinBookmark.create({
    data: { pinId, userId: user.id },
  });

  return c.json(bookmark, 201);
});

map.delete('/bookmarks/:pinId', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const pinId = c.req.param('pinId');
  await prisma.mapPinBookmark.deleteMany({
    where: { pinId, userId: user.id },
  });

  return c.json({ success: true });
});

// ============================================
// Geocoding (proxy to Google Maps)
// ============================================
map.get('/geocode', async (c) => {
  const { address } = c.req.query();
  if (!address) return c.json({ error: 'Address is required' }, 400);

  // Check cache first
  const cached = await prisma.geocodingCache.findUnique({ where: { address } });
  if (cached) {
    return c.json({ lat: cached.lat, lng: cached.lng, country: cached.country, city: cached.city, area: cached.area });
  }

  // In production, call Google Maps Geocoding API
  // For now, return mock data
  return c.json({ lat: 23.8103, lng: 90.4125, country: 'Bangladesh', city: 'Dhaka', area: 'Dhanmondi' });
});

map.get('/reverse-geocode', async (c) => {
  const { lat, lng } = c.req.query();
  if (!lat || !lng) return c.json({ error: 'lat and lng are required' }, 400);

  // In production, call Google Maps Reverse Geocoding API
  return c.json({ address: 'Dhaka, Bangladesh', city: 'Dhaka', country: 'Bangladesh', area: 'Dhanmondi' });
});

export default map;
