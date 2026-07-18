const APEX_HOST = 'supersean007.com';
const CANONICAL_HOST = 'www.supersean007.com';

export async function onRequest({request, next}) {
  const url = new URL(request.url);
  if (url.hostname.toLowerCase() === APEX_HOST) {
    url.hostname = CANONICAL_HOST;
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 308);
  }
  return next();
}
