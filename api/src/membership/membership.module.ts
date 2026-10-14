import { Module } from "@nestjs/common";
import { MEMBERSHIP, membershipProvider } from "./membership.provider.js";

@Module({
  providers: [membershipProvider],
  exports: [MEMBERSHIP],
})
export class MembershipModule {}
