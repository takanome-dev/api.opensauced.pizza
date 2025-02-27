import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Repository, SelectQueryBuilder } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

import { PageMetaDto } from "../common/dtos/page-meta.dto";
import { PageDto } from "../common/dtos/page.dto";
import { PageOptionsDto } from "../common/dtos/page-options.dto";
import { UserService } from "../user/services/user.service";
import { DbWorkspaceContributor } from "./entities/workspace-contributors.entity";
import { DbWorkspace } from "./entities/workspace.entity";
import { WorkspaceService } from "./workspace.service";
import { canUserEditWorkspace, canUserViewWorkspace } from "./common/memberAccess";
import { UpdateWorkspaceContributorsDto } from "./dtos/update-workspace-contributors.dto";
import { DeleteWorkspaceContributorsDto } from "./dtos/delete-workspace-contributors.dto";

@Injectable()
export class WorkspaceContributorsService {
  constructor(
    @InjectRepository(DbWorkspaceContributor, "ApiConnection")
    private workspaceContributorRepository: Repository<DbWorkspaceContributor>,
    private workspaceService: WorkspaceService,
    private userService: UserService
  ) {}

  baseQueryBuilder(): SelectQueryBuilder<DbWorkspaceContributor> {
    const builder = this.workspaceContributorRepository.createQueryBuilder("workspace_contributors");

    return builder;
  }

  async findAllContributorsGuarded(
    pageOptionsDto: PageOptionsDto,
    id: string,
    userId: number | undefined
  ): Promise<PageDto<DbWorkspaceContributor>> {
    const workspace = await this.workspaceService.findOneById(id);

    /*
     * viewers, editors, and owners can see what contributors belongs to a workspace
     */

    const canView = canUserViewWorkspace(workspace, userId);

    if (!canView) {
      throw new NotFoundException();
    }

    const entities = await this.findAllContributors(id);

    const pageMetaDto = new PageMetaDto({ itemCount: entities.length, pageOptionsDto });

    return new PageDto(entities, pageMetaDto);
  }

  async findAllContributors(id: string): Promise<DbWorkspaceContributor[]> {
    const queryBuilder = this.baseQueryBuilder();

    queryBuilder
      .leftJoinAndSelect(
        "workspace_contributors.contributor",
        "workspace_contributors_contributor",
        "workspace_contributors.contributor_id = workspace_contributors_contributor.id"
      )
      .where("workspace_contributors.workspace_id = :id", { id });

    return queryBuilder.getMany();
  }

  async addOneWorkspaceContributor(
    id: string,
    userId: number,
    contributorId?: number,
    contributorLogin?: string
  ): Promise<DbWorkspace> {
    const workspace = await this.workspaceService.findOneById(id);

    /*
     * owners and editors can update the workspace contributors
     */

    const canUpdate = canUserEditWorkspace(workspace, userId);

    if (!canUpdate) {
      throw new UnauthorizedException();
    }

    await this.executeAddWorkspaceContributor(workspace, contributorId, contributorLogin);

    return this.workspaceService.findOneById(id);
  }

  async addWorkspaceContributors(
    dto: UpdateWorkspaceContributorsDto,
    id: string,
    userId: number
  ): Promise<DbWorkspace> {
    const workspace = await this.workspaceService.findOneById(id);

    /*
     * owners and editors can update the workspace contributors
     */

    const canUpdate = canUserEditWorkspace(workspace, userId);

    if (!canUpdate) {
      throw new UnauthorizedException();
    }

    const promises = dto.contributors.map(async (contributor) => {
      await this.executeAddWorkspaceContributor(workspace, contributor.id, contributor.login);
    });

    await Promise.all(promises);
    return this.workspaceService.findOneById(id);
  }

  private async executeAddWorkspaceContributor(
    workspace: DbWorkspace,
    contributorId?: number,
    contributorLogin?: string
  ) {
    if (!contributorId && !contributorLogin) {
      throw new BadRequestException("either user id or login must be provided");
    }

    const user = await this.userService.tryFindUserOrMakeStub(contributorId, contributorLogin);

    const existingContributor = await this.workspaceContributorRepository.findOne({
      where: {
        workspace_id: workspace.id,
        contributor_id: user.id,
      },
      withDeleted: true,
    });

    if (existingContributor) {
      await this.workspaceContributorRepository.restore(existingContributor.id);
    } else {
      if (user.type.toLowerCase() === "organization") {
        throw new NotFoundException("not a contributor");
      }

      const newContributor = new DbWorkspaceContributor();

      newContributor.workspace = workspace;
      newContributor.contributor = user;

      await this.workspaceContributorRepository.save(newContributor);
    }
  }

  async deleteOneWorkspaceContributor(id: string, userId: number, contributorId?: number, contributorLogin?: string) {
    let user;

    if (contributorId) {
      user = await this.userService.findOneById(contributorId);
    } else if (contributorLogin) {
      user = await this.userService.findOneByUsername(contributorLogin);
    } else {
      throw new BadRequestException("either user id or login must be provided");
    }

    const workspace = await this.workspaceService.findOneById(id);

    /*
     * owners and editors can delete the workspace contributors
     */

    const canDelete = canUserEditWorkspace(workspace, userId);

    if (!canDelete) {
      throw new UnauthorizedException();
    }

    const existingContributor = await this.workspaceContributorRepository.findOne({
      where: {
        workspace_id: id,
        contributor_id: user.id,
      },
    });

    if (!existingContributor) {
      throw new NotFoundException();
    }

    await this.workspaceContributorRepository.softDelete(existingContributor.id);

    return this.workspaceService.findOneById(id);
  }

  async deleteWorkspaceContributors(dto: DeleteWorkspaceContributorsDto, id: string, userId: number) {
    const workspace = await this.workspaceService.findOneById(id);

    /*
     * owners and editors can delete the workspace contributors
     */

    const canDelete = canUserEditWorkspace(workspace, userId);

    if (!canDelete) {
      throw new UnauthorizedException();
    }

    const promises = dto.contributors.map(async (contributor) => {
      let user;

      if (contributor.id) {
        user = await this.userService.findOneById(contributor.id);
      } else if (contributor.login) {
        user = await this.userService.findOneByUsername(contributor.login);
      } else {
        throw new BadRequestException("either user id or login must be provided");
      }

      const existingContributor = await this.workspaceContributorRepository.findOne({
        where: {
          workspace_id: id,
          contributor_id: user.id,
        },
      });

      if (!existingContributor) {
        throw new NotFoundException();
      }

      return this.workspaceContributorRepository.softDelete(existingContributor.id);
    });

    try {
      await Promise.all(promises);
    } catch (error) {
      dto.contributors.forEach(async (contributor) => {
        let user;

        if (contributor.id) {
          user = await this.userService.findOneById(contributor.id);
        } else if (contributor.login) {
          user = await this.userService.findOneByUsername(contributor.login);
        } else {
          throw new BadRequestException("either user id or login must be provided");
        }

        // restore the contributors who may have been soft deleted
        const existingContributor = await this.workspaceContributorRepository.findOne({
          where: {
            workspace_id: id,
            contributor_id: user.id,
          },
          withDeleted: true,
        });

        if (existingContributor) {
          await this.workspaceContributorRepository.restore(existingContributor.id);
        }
      });

      // throws the original error
      throw error;
    }

    return this.workspaceService.findOneById(id);
  }
}
