import { IAdmin } from "../../models/admin.interface";
import { IStudent } from "../../models/student.interface";
import {
  IAdminModelData,
  IUserModelData,
  IAdminModelDataDocument,
} from "model_template/model_data.interface";
import { Request } from "express";
import { MulterS3File } from "multer-s3";

declare global {
  namespace Express {
    interface Request {
      both: IAdminModelData | IUserModelData;
      admin: IAdminModelData | IAdminModelDataDocument | any;
      student: IUserModelData;
      files?: any;
    }
  }
  namespace MulterS3 {
    interface File extends Express.Multer.File {
      location: string;
    }
  }
}
