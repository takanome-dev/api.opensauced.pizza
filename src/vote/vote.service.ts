import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { RepoToUserVotes } from "../repo/entities/repo.to.user.votes.entity";

@Injectable()
export class VoteService {
  constructor(
    @InjectRepository(RepoToUserVotes)
    private repoVoteRepository: Repository<RepoToUserVotes>,
  ) {}

  baseQueryBuilder() {
    const builder = this.repoVoteRepository.createQueryBuilder("r2votes")
      .withDeleted();

    return builder;
  }

  async voteByRepoId(repoId: number, userId: number): Promise<RepoToUserVotes> {
    const queryBuilder = this.baseQueryBuilder();

    queryBuilder
      .where("r2votes.repo_id = :repoId", { repoId })
      .andWhere("r2votes.user_id = :userId", { userId });

    const voteExists = await queryBuilder.getOne();

    if (voteExists) {
      if (voteExists.deleted_at === null) {
        throw new ConflictException("You have already voted for this repo");
      }

      await this.repoVoteRepository.restore(voteExists.id);

      return voteExists;
    }

    return this.repoVoteRepository.save({
      repo_id: repoId,
      user_id: userId,
    });
  }

  async downVoteByRepoId(repoId: number, userId: number): Promise<RepoToUserVotes> {
    const queryBuilder = this.baseQueryBuilder();

    queryBuilder
      .where("r2votes.repo_id = :repoId", { repoId })
      .andWhere("r2votes.user_id = :userId", { userId });

    const voteExists = await queryBuilder.getOne();

    if (!voteExists) {
      throw new NotFoundException("You have not voted for this repo");
    }

    if (voteExists.deleted_at !== null) {
      throw new ConflictException("You have already removed your vote");
    }

    await this.repoVoteRepository.softDelete(voteExists.id);

    return voteExists;
  }
}