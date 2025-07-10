import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { App, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { DayRecord } from '../types/day';

// Initialize Firebase Admin if not already initialized
let app: App;
if (getApps().length === 0) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

const db: Firestore = getFirestore(app);
const COLLECTION_NAME = 'days';

/**
 * Firebase Function for generating sitemap.xml
 * Returns a sitemap containing all completed day records
 */
export const sitemap = onRequest(async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).send('Method not allowed. Use GET.');
    return;
  }

  try {
    logger.log('Generating sitemap.xml');

    // Query all day records with status 'completed'
    const snapshot = await db
      .collection(COLLECTION_NAME)
      .where('status', '==', 'completed')
      .orderBy('__name__', 'asc')
      .get();

    const completedDays: DayRecord[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DayRecord[];

    logger.log(`Found ${completedDays.length} completed day records`);

    // Generate sitemap XML
    const baseUrl = getBaseUrl(request);
    const sitemap = generateSitemapXml(completedDays, baseUrl);

    // Set appropriate headers
    response.set('Content-Type', 'application/xml');
    response.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    response.status(200).send(sitemap);
  } catch (error) {
    logger.error('Error generating sitemap:', error);
    response.status(500).send('Error generating sitemap');
  }
});

/**
 * Generate the base URL from the request
 */
function getBaseUrl(request: any): string {
  const protocol = request.get('x-forwarded-proto') || 'https';
  const host = request.get('host');
  return `${protocol}://${host}`;
}

/**
 * Generate sitemap XML for completed day records
 */
function generateSitemapXml(dayRecords: DayRecord[], baseUrl: string): string {
  const urlEntries = dayRecords
    .map((day) => {
      const url = `${baseUrl}/${day.id}`;
      const lastmod = day.updatedAt.toDate().toISOString().split('T')[0];
      
      return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join('\n');

  // Add the homepage URL
  const homepageEntry = `  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${homepageEntry}
${urlEntries}
</urlset>`;
}