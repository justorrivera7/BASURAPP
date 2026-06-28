FROM node:20-alpine AS build

WORKDIR /frontend

COPY package.json yarn.lock ./
RUN yarn install

COPY . .

ARG REACT_APP_BACKEND_URL
ARG REACT_APP_GOOGLE_MAPS_API_KEY
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL \
    REACT_APP_GOOGLE_MAPS_API_KEY=$REACT_APP_GOOGLE_MAPS_API_KEY

RUN yarn build

# --- Serve stage ---
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
