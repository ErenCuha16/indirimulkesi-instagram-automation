const API_URL = 'https://api.buffer.com';

async function bufferRequest(apiKey, query, variables) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (json.errors) {
    throw new Error(`Buffer API error: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

async function getOrganizations(apiKey) {
  const data = await bufferRequest(
    apiKey,
    `query { account { organizations { id name } } }`
  );
  return data.account.organizations;
}

async function getChannels(apiKey, organizationId) {
  const data = await bufferRequest(
    apiKey,
    `query GetChannels($input: ChannelsInput!) {
      channels(input: $input) { id name service }
    }`,
    { input: { organizationId } }
  );
  return data.channels;
}

async function createPost(apiKey, { channelId, text, imageUrl, mode = 'shareNow', instagramType = 'post' }) {
  const input = {
    text,
    channelId,
    schedulingType: 'automatic',
    mode,
    metadata: { instagram: { type: instagramType, shouldShareToFeed: true } },
  };

  if (imageUrl) {
    input.assets = [{ image: { url: imageUrl } }];
  }

  const data = await bufferRequest(
    apiKey,
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post { id text dueAt }
        }
        ... on MutationError {
          message
        }
      }
    }`,
    { input }
  );

  return data.createPost;
}

module.exports = { getOrganizations, getChannels, createPost };
