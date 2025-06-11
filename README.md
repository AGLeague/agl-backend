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

#### STATS_SHEET
This is the stats sheet that serves as a starting point for reading the data needed to calculate the achievements.

#### PASSWORD
This is a password used to access the admin apis that do the initial data load. 

It's provided to the apis as a query parameter as a get request, to make it easier to get going. It should eventually be updated to read from a request header.

### Running the server

The server can be run with `npm run dev`, which will watch the files, and automatically rebuild and restart the server when the files change. 

One note with this, I have noticed the server reboots a second time after a file change - about 10 seconds later. Since the load request takes a long time, I tent to try to wait for the second load to complete, 

For a more stable run, the build and and run can be run separately with `npm run build` and `npm run start` respectively.

This repo also includes a Containerfile that can be used to build a docker or podman image. This is built automatically on each push to main, and is the build used to run the deployed version. See the `.github/workflows/docker-image.yml` file to see how that build is done. 
