export interface IProposalFieldsV4 {
  text?: string;
  proposalId?: string[];
  title?: string[];
  firstname?: string[];
  lastname?: string[];
  email?: string[];
  pi_email?: string[];
  pi_firstname?: string[];
  pi_lastname?: string[];
  type?: string[];
  ownerGroup?: string[];
  accessGroups?: string[];
  userGroups?: string[];
  isPublished?: boolean;
  startTime?: { begin: string; end: string };
  endTime?: { begin: string; end: string };
  keywords?: string[];
  instrumentIds?: string[];
  parentProposalId?: string[];
  [key: string]: unknown;
}
