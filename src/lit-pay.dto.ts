import { LitNetwork } from '@lit-protocol/constants';

export class RegisterPayerHandlerDto {
  network: LitNetwork;
  initDataRaw: string;
}

export class AddPayeeDto {
  network: LitNetwork;
  payerPrivateKey: string;
  payee: string;
  initDataRaw: string;
}

export class GetPayerAuthSigDto {
  payerPrivateKey: string;
  initDataRaw: string;
  payee: string;
}
