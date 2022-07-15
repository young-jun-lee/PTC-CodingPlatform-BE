# 💻 PTC Coding Platform 2022 - Backend

## About

During the months of June and July 2022, Project Tech Conferences hosted a coding challenge, releasing new questions on a weekly cadence. The coding platform was created to allow users to view the weekly questions, create accounts, reset their passwords, upload their submissions to specific questions and later view their submissions and corresponding scores. Admin accounts can also view all submissions made by all users and update the scores for each submission.

This is the repository for the backend for the 2022 Coding Platform currently deployed on Heroku.

The resolvers in this project are responsible for the many functionalities of the platform. Once the backend is connected to the PSQL database, it can perform CRUD operations, generate AWS S3 presigned URLs to upload and download files to a bucket, manage user account creation and send emails to users.

Built with **NodeJS**, **TypeScript**, **GraphQL**, **TypeORM** , **PostgreSQL**, **Redis** and **AWS S3**.

## Getting Started

To run the project on your local device, install the module dependencies:

```
npm install
```

then run the development server:

```
npm run dev
# or
yarn dev
```

Open [http://localhost:4000/graphql](http://localhost:4000/graphql) with your browser to see the result.
