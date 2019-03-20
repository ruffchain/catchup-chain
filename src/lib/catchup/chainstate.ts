
/**
 * Store info in it
 * Could be a cache
 */
export class ChainState {
  public latestHeight: number;
  public latestIrbheight: number;

  // current height in sqlite3 db
  public syncedHeight: number;

  constructor() {
    this.latestHeight = 0;
    this.latestIrbheight = 0;
    this.syncedHeight = 0;
  }
}
