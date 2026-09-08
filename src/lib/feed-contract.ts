export type PublicFeedItem = {
  id: string;
  recipient: string;
  message: string;
  expressionIds: number[];
  firstPublishedAt: string;
  expiresAt: string;
};

export type PublicFeedSnapshot = {
  serverTime: string;
  items: PublicFeedItem[];
};
