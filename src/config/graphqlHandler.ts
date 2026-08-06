type ResponseType = {
  data: {
    userByOIDCSub: {
      proposals: {
        proposalId: string;
      }[];
    };
  };
};
/*
const responseProcessor = (response: Record<string, unknown>) => {
  const proposals = (response as ResponseType).data.userByOIDCSub?.proposals;
  if (!proposals) return [];
  return proposals.map((proposal) => proposal.proposalId);......dsdasd
};
*/

export class graphHandler {
  public static responseProcessor(response: Record<string, unknown>): string[] {
    const proposals = (response as ResponseType).data.userByOIDCSub?.proposals;
    if (!proposals) return [];
    return proposals.map((proposal) => proposal.proposalId);
  }
  public static graphqlTemplateQuery = `
    {
      userByOIDCSub(oidcSub: "{{userId}}") {
        proposals {
          proposalId
        }
      }
    }`;
}
