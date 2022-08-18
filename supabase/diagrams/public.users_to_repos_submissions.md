# public.users_to_repos_submissions

## Description

## Columns

| Name       | Type                     | Default | Nullable | Children | Parents                         | Comment |
| ---------- | ------------------------ | ------- | -------- | -------- | ------------------------------- | ------- |
| id         | bigint                   |         | false    |          |                                 |         |
| user_id    | bigint                   |         | false    |          | [public.users](public.users.md) |         |
| repo_id    | bigint                   |         | false    |          | [public.repos](public.repos.md) |         |
| created_at | timestamp with time zone | now()   | true     |          |                                 |         |
| updated_at | timestamp with time zone | now()   | false    |          |                                 |         |
| deleted_at | timestamp with time zone |         | true     |          |                                 |         |

## Constraints

| Name                                    | Type        | Definition                                 |
| --------------------------------------- | ----------- | ------------------------------------------ |
| users_to_repos_submissions_repo_id_fkey | FOREIGN KEY | FOREIGN KEY (repo_id) REFERENCES repos(id) |
| users_to_repos_submissions_user_id_fkey | FOREIGN KEY | FOREIGN KEY (user_id) REFERENCES users(id) |
| submissions_pkey                        | PRIMARY KEY | PRIMARY KEY (id)                           |
| submissions_hash                        | UNIQUE      | UNIQUE (user_id, repo_id)                  |

## Indexes

| Name             | Definition                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| submissions_pkey | CREATE UNIQUE INDEX submissions_pkey ON public.users_to_repos_submissions USING btree (id)               |
| submissions_hash | CREATE UNIQUE INDEX submissions_hash ON public.users_to_repos_submissions USING btree (user_id, repo_id) |

## Relations

![er](public.users_to_repos_submissions.svg)

---

> Generated by [tbls](https://github.com/k1LoW/tbls)