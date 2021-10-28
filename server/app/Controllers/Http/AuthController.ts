// import Hash from '@ioc:Adonis/Core/Hash'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import Token from 'App/Models/Token'
import User from 'App/Models/User'

export default class AuthController {
  public async register({ request, response }: HttpContextContract) {
    const { name, email, password } = request.all()
    /**
     * Schema definition
     */
    const newUserSchema = schema.create({
      name: schema.string({ escape: true }),
      email: schema.string({ escape: true }, [rules.unique({ table: 'users', column: 'email' })]),
      password: schema.string(),
    })

    try {
      /**
       * Validate request body against the schema
       */
      await request.validate({ schema: newUserSchema })

      // Create new user
      const user = await User.create({
        name,
        email,
        password,
      })
      return user.toJSON()
    } catch (error) {
      console.log(error)
      if (error.messages && error.messages.errors) {
        return response.badRequest(error.messages.errors[0].message)
      }
      return response.badRequest('Invalid Request')
    }
  }

  public async login({ auth, request, response }: HttpContextContract) {
    const { email, password } = request.all()
    // console.log(await Hash.make(password))

    try {
      // Create new token and refresh token
      const token = await auth.use('api').attempt(email, password, {
        expiresIn: '15mins',
      })
      const refreshToken = await auth.use('api').generate(auth.user, {
        expiresIn: '1seconds', // will be deleted from Redis in one second
      })

      // Storing refresh token in database
      const TokenInsert = new Token()
      TokenInsert.user_id = auth.user?.id
      TokenInsert.token = refreshToken.token
      await TokenInsert.save()
      return {
        token: token.token,
        refreshToken: refreshToken.token,
      }
    } catch (error) {
      console.log(error)
      return response.badRequest('Invalid credentials')
    }
  }

  public async tokenRefresh({ auth, request, response }: HttpContextContract) {
    const { refreshToken } = request.all()
    try {
      // Check if refresh token is valid or not
      const tokenExists = await Token.query()
        .where('token', refreshToken)
        .select('id', 'user_id')
        .firstOrFail()

      if (tokenExists) {
        // Create new token and refresh token
        const user = await User.query().select('id').firstOrFail()
        const newToken = await auth.use('api').generate(user, {
          expiresIn: '15mins',
        })
        const newRefreshToken = await auth.use('api').generate(user, {
          expiresIn: '1seconds', // will be deleted from Redis in one second
        })

        // Update old refresh token with the new one
        await Token.query().where('id', tokenExists.id).update({
          token: newRefreshToken.token,
        })
        return {
          token: newToken.token,
          refreshToken: newRefreshToken.token,
        }
      }
    } catch (error) {
      console.log(error)
      return response.badRequest('Invalid Refresh Token')
    }
  }

  public async logout({ auth, request, response }: HttpContextContract) {
    const { refreshToken } = request.all()
    try {
      // Delete refresh token from database
      await Token.query().where('token', refreshToken).delete()

      // revoke token from Redis server
      await auth.use('api').revoke()
      return {
        revoked: true,
      }
    } catch (error) {
      console.log(error)
      return response.badRequest('Invalid Refresh Token')
    }
  }
}
