import { QueryCommand, CommandType } from 'src/command/query/query.command';
import { QueryResult } from 'src/common/query-result';
import { SelectQueryBuilder } from 'typeorm';

export class QueryModelPaginateCommand extends QueryCommand {
  static description = `
    Magic query command, Paginate the results.
  `;

  static version = '1.0';

  static commandType = CommandType.QUERY_MODEL_COMMAND;

  static commandName = 'paginate';

  isEffectResultCount = true;

  get pageSize(): number {
    return parseInt(this.commandMeta.value[0]);
  }

  get pageIndex() {
    return parseInt(this.commandMeta.value[1]);
  }

  addToQueryBuilder(qb: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
    console.assert(
      this.commandMeta.value?.length > 0,
      'Too few pagination parmas',
    );
    qb.skip(this.pageSize * this.pageIndex).take(this.pageSize);
    return qb;
  }

  filterResult(result: QueryResult): QueryResult {
    result.pagination = {
      pageSize: this.pageSize,
      pageIndex: this.pageIndex,
      totalCount: result.totalCount,
    };
    return result;
  }
}
