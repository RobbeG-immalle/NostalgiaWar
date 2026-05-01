export interface Item {
  id: string;
  title: string;
  youtube_url: string;
  category: string;
}

export interface Vote {
  id: string;
  item_a_id: string;
  item_b_id: string;
  voted_item_id: string;
  created_at: string;
}

export interface Pair {
  itemA: Item;
  itemB: Item;
}

export interface VoteResult {
  itemA: {
    item: Item;
    votes: number;
    percentage: number;
  };
  itemB: {
    item: Item;
    votes: number;
    percentage: number;
  };
  total: number;
}
