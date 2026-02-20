export interface IOidcUserInfoMapping {
  id: string;
  username: string;
  displayName: string;
  familyName: string;
  email: string;
  thumbnailPhoto: string;
  groups?: string[];
  provider?: string;
  [key: string]: string | string[] | undefined;
}

export interface IOidcUserQueryMapping {
  operator: string;
  filter: string[];
}
