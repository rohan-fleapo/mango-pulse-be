import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      url?: string;
    }>();

    // console.log('🛡️  JWT Guard Check:');
    // console.log('   URL:', request.url);
    // console.log('   Public:', isPublic);
    // console.log(
    //   '   Auth Header:',
    //   request.headers.authorization ? '✅ Present' : '❌ MISSING',
    // );

    if (request.headers.authorization) {
      // console.log(
      //   '   Token preview:',
      //   request.headers.authorization.substring(0, 30) + '...',
      // );
    }

    if (isPublic) {
      // console.log('   → Allowing (public route)');
      return true;
    }

    if (!request.headers.authorization) {
      // console.log('   → REJECTING (no auth header) - will return 401');
    } else {
      // console.log('   → Validating token...');
    }

    return super.canActivate(context);
  }
}
