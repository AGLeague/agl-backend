# AGL Achievements

## Development

### Environment Setup

The project needs three environment variables set to use do it's job. When using the `dev` npm script, 
it will load environment variables from a .env file. Since this file includes keys, it is excluded from git, and you will need to create your own .env file. 

```.env
API_KEY={your google api key}
STATS_SHEET=1DZ1y71E3DwwmgV43534n1GEgck-GMDnV7im2mbaHCWE
PASSWORD={your api password}
```

#### API_KEY
To read from the google sheets apis, you will need to create a project and API key in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

The project will have 

#### STATS_SHEET
This is the stats sheet that serves as a starting point for reading the data needed to calculate the achievements.

#### PASSWORD
This sets a password that will be used to access the admin apis, such as the initial data load. This password is only used to verify callers to the application, it is not an existing password to a different system.

It's provided to the apis as a query parameter of get requests (see below), to make it easier to get going. Once I've got the server more stable, this should be updated to read from a request header, instead of a query parameter. Or removed once we have more stable authentication.

### Running the server

The server can be run with `npm run dev`, which will watch the files, and automatically rebuild and restart the server when the files change. 

One note with this, I have noticed the server reboots a second time after a file change - about 10 seconds later. Since the load request takes a long time, I tent to try to wait for the second load to complete, 

For a more stable run, the build and and run can be run separately with `npm run build` and `npm run start` respectively.

This repo also includes a Containerfile that can be used to build a docker or podman image. This is built automatically on each push to main, and is the build used to run the deployed version. See the `.github/workflows/docker-image.yml` file to see how that build is done. 

### Loading the data
Once the server is running, an initial request can be made to have the server populate it's database with the data from the google sheets for a single league. 
This request can be begun by navigating to <http://localhost:8000/api/admin/load/init/TDM?password={PASSWORD}> in a browser.

## Data Model

This project reads the data from the Arena Gauntlet Leagues stats sheet, and populates a database that can then be queried to view various achievements. Since the source of truth for all the data at this time is the google sheet, which can be requeried, I have been deleting the database whenever the schema changes. The sequelize library I am using has support for managing migrations, to direct it how to migrate the db schema, so we will eventually want to get support for that.

Once the data import is complete, I plan to as many of the achievements as possible defined directly in sql, having a view that returns the unlocked achievements for a player. This allows us to fix any bugs that impact achievement unlocking retroactively. Since we don't want all achievements to be unlocked retroactively, the view will need to exclude some matches based on when we start.

There will be other achievements that can not be determined just by looking at historical information. For instance, once a league is over, we can't tell who was in the top8 at the end of week 2. For these type of *Snapshot Achievements* we will need to keep track of when they are unlocked, and store that directly in the database. The view mentioned above should be able to read from the table these are stored in, so this difference won't impact retrieval.

### TODOs
  - [ ] Handle Dragon matches, so we can load NXT League.
  - [ ] Verify Entropy is handled correctly accross all leagues.
  - [ ] Add migrations so future data won't be lost when the data schema changes
  - [ ] Add a backround task to re-scan the matches on a regular basis.
    - [ ] Look into google sheets web hooks, to automatically be notified when a match is completed
  - [ ] Better authentication/User login. I think for our use case, sign in with Discord would make sense. 


