import { Router } from "express";
import { auth } from "../lib/auth";

const userRouter = Router();

userRouter.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const origin = req.headers.origin;
    console.log(origin);
    
    if (!name || !email || !password)
      return res.status(400).json({
        success: false,
        data: null,
      });

    const result = await auth.api.signUpEmail({
      body: {
        name: name,
        email: email,
        password: password,
      },
      headers: { origin },
    });

    return res.status(201).json({
      success: true,
      data: {
        token: result.token,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      data: null
    });
  }
});

userRouter.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const origin = req.headers.origin;

    if (!email || !password)
      return res.status(400).json({
        success: false,
        data: null,
      });

    const result = await auth.api.signInEmail({
      body: {
        email: email,
        password: password,
      },
      headers: { origin },
    });

    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("Signin error:", error);
    return res.status(500).json({
      success: false,
      data: null
    });
  }
});

export default userRouter;
