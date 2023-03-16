import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { PageOptionsDto } from "../common/dtos/page-options.dto";
import { ApiPaginatedResponse } from "../common/decorators/api-paginated-response.decorator";
import { DbPullRequest } from "./entities/pull-request.entity";
import { PageDto } from "../common/dtos/page.dto";
import { PullRequestService } from "./pull-request.service";
import { PullRequestPageOptionsDto } from "./dtos/pull-request-page-options.dto";

@Controller("prs")
@ApiTags("Pull Requests service")
export class PullRequestController {
  constructor (
    private readonly pullRequestService: PullRequestService,
  ) {}

  @Get("/list")
  @ApiOperation({
    operationId: "listAllPullRequests",
    summary: "Finds all pull requests and paginates them",
  })
  @ApiPaginatedResponse(DbPullRequest)
  @ApiOkResponse({ type: DbPullRequest })
  async listAllPullRequests (
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<DbPullRequest>> {
    return this.pullRequestService.findAll(pageOptionsDto);
  }

  @Get("/search")
  @ApiOperation({
    operationId: "searchAllPullRequests",
    summary: "Searches pull requests using filters and paginates them",
  })
  @ApiPaginatedResponse(DbPullRequest)
  @ApiOkResponse({ type: DbPullRequest })
  async searchAllPullRequests (
    @Query() pageOptionsDto: PullRequestPageOptionsDto,
  ): Promise<PageDto<DbPullRequest>> {
    return this.pullRequestService.findAllWithFilters(pageOptionsDto);
  }
}