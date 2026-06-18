export const getAvatarUrl = (url, username) => {
  if (url?.startsWith('/uploads')) return url;
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username || 'default')}`;
};
