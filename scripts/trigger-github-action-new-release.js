const axios = require('axios');
const process = require('node:process');

async function triggerWorkflow(owner, repo, workflowId, ref, inputs) {
  try {
    const response = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        ref,
      },
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    console.log('Workflow triggered successfully:', response.status);
  } catch (error) {
    console.error('Error triggering workflow:', error.response.data);
  }
}

// Example usage
triggerWorkflow(
  'kokofixcomputers', //Owner of repo
  'eureka', //repo name
  'validate.yml', // workflow id can also be the name of the file
  'trunk', // The git reference for the workflow (branch or tag name)
  {
    triggered_by: 'GitHub API' //junk that should be get rid of later
  }
);