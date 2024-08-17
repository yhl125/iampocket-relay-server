import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import {
  ValidateTelegramDto,
  ValidateTelegramWithPkpTokenIdDto,
} from './validate-telegram.dto';
import { IRelayPKP, AuthSig } from '@lit-protocol/types';
import {
  AddPayeeDto,
  GetPayerAuthSigDto,
  RegisterPayerHandlerDto,
} from './lit-pay.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('telegram/validate')
  validateTelegram(
    @Body() data: ValidateTelegramWithPkpTokenIdDto,
  ): Promise<boolean> {
    return this.appService.validateData(data.initDataRaw, data.pkpTokenId);
  }

  @Post('telegram/create-pkp')
  createPKPWithTelegram(@Body() data: ValidateTelegramDto): Promise<{
    tokenId: any;
    publicKey: string;
    ethAddress: string;
  }> {
    return this.appService.createPkpAndPermitLitActionToUsePkp(
      data.initDataRaw,
    );
  }

  @Post('telegram/get-pkps')
  getPkpsForTelegramUser(
    @Body() data: ValidateTelegramDto,
  ): Promise<IRelayPKP[]> {
    return this.appService.getPkpsForTelegramUser(data.initDataRaw);
  }

  @Post('register-payer')
  registerPayer(@Body() data: RegisterPayerHandlerDto): Promise<{
    payerWalletAddress: string;
    payerPrivateKey: string;
  }> {
    return this.appService.registerPayerHandler(data.network, data.initDataRaw);
  }

  @Post('add-payee')
  addPayee(@Body() data: AddPayeeDto): Promise<boolean> {
    return this.appService.addPayeeHandler(data);
  }

  @Post('payer-authsig')
  async getPayerAuthSig(@Body() data: GetPayerAuthSigDto): Promise<AuthSig> {
    return this.appService.getPayerAuthSig(data);
  }
}
